import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { db, app } from "../../firebase/firebase.init";
import { useState } from "react";
import { Wallet } from "ethers";
import { splitMnemonic, recoverMnemonic } from "shamir-bip39";
import { doc, getDoc, setDoc } from "firebase/firestore";

const Login = () => {
  const [user, setUser] = useState();
  const [userWallet, setUserWallet] = useState();
  const [shares, setShares] = useState();
  const [accessToken, setAccessToken] = useState();
  const [fileId, setFileId] = useState("");
  const [keyshare1, setKeyshare1] = useState();
  const [keyshare2, setKeyshare2] = useState();
  const [keyshare3, setKeyshare3] = useState();
  const [keyCombine, setKeyCombine] = useState();

  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope("https://www.googleapis.com/auth/drive.appdata");
  googleProvider.addScope("https://www.googleapis.com/auth/drive.file");

  const uploadEncryptedFileToAppDataFolder = async (
    encryptedData,
    accessToken
  ) => {
    const file = new Blob([encryptedData], { type: "text/plain" });
    const metadata = {
      name: "keyshare.txt", // Filename at Google Drive
      mimeType: "text/plain", // MIME type
      parents: ["appDataFolder"], // Specify the appDataFolder as the parent
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: new Headers({ Authorization: "Bearer " + accessToken }),
        body: form,
      }
    )
      .then((response) => response.json())
      .then((result) => {
        setFileId(result.id);
      })
      .catch((error) => console.error(error));
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;
      console.log(loggedInUser.accessToken);
      console.log(result);
      setUser(loggedInUser);
      setAccessToken(result._tokenResponse.oauthAccessToken);

      const wallet = Wallet.createRandom();
      setUserWallet(wallet);

      const mnemonic = wallet.mnemonic.phrase;
      console.log(mnemonic);
      const shares = splitMnemonic(mnemonic, 3, 2);

      setShares(shares);

      handleStoreToLocalStorage(shares[1]);
      await uploadEncryptedFileToAppDataFolder(
        shares[2],
        result._tokenResponse.oauthAccessToken
      );

      // Store user data with share[3] to firestore
      const userRef = doc(db, "users", loggedInUser.providerData[0].uid);
      await setDoc(userRef, {
        uid: loggedInUser.providerData[0].uid,
        email: loggedInUser.email,
        share: shares[3],
      });
    } catch (error) {
      console.log("error", error.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth)
      .then((result) => {
        console.log(result);
        setUser(null);
      })
      .catch((error) => {
        console.log("error", error.message);
      });
  };

  const handleStoreToLocalStorage = (share) => {
    localStorage.setItem("keyshare", share);
  };

  const getLocalStorage = () => {
    const share = localStorage.getItem("keyshare");
    console.log(share);
    setKeyshare1(share);
  };

  const getShareFromDrive = async (fileId) => {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        method: "GET",
        headers: new Headers({ Authorization: "Bearer " + accessToken }),
      }
    ).then((response) => {
      return response.body
        .getReader()
        .read()
        .then((result) => {
          console.log(new TextDecoder().decode(result.value));
          setKeyshare2(new TextDecoder().decode(result.value));
        });
    });
  };

  const getShareFromFirestore = async (uid) => {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log("Document data:", userDoc.data());
      setKeyshare3(userDoc.data().share);
    } else {
      console.log("No such document!");
    }
  };

  const combineKeys = (keyshare1, keyshare3) => {
    console.log("keyshare1", keyshare1);
    console.log("keyshare2", keyshare2);
    const combinedMnemonic = recoverMnemonic({
      1: keyshare1,
      2: keyshare3,
    });
    console.log("combinedMnemonic", combinedMnemonic);
    setKeyCombine(combinedMnemonic);
  };

  return (
    <div>
      {user ? (
        <button onClick={handleSignOut}>Sign Out</button>
      ) : (
        <div>
          <button onClick={handleGoogleSignIn}>Google Login</button>
        </div>
      )}
      {user && (
        <div>
          <h3>User: {user.displayName}</h3>
          <p>Email: {user.email}</p>
          <p>User Data: {user.providerData[0].uid}</p>
        </div>
      )}
      {/* {userWallet ? (
        <div>
          {<h3>Wallet: {userWallet.mnemonic.phrase}</h3>}
          <button onClick={handleSplitKeys}>Split keys</button>
        </div>
      ) : (
        <button onClick={handleCreateWallet}>Create wallet</button>
      )} */}
      {shares && shares[1] ? (
        <div>
          {Object.values(shares).map((share, id) => {
            return (
              <div key={id} value={share}>
                <p>{share}</p>
              </div>
            );
          })}
          {
            <div>
              <button onClick={getLocalStorage}>Get Local storage</button>
              <button onClick={() => getShareFromDrive(fileId)}>
                Get share from Google Drive
              </button>
              <button
                onClick={() => getShareFromFirestore(user.providerData[0].uid)}
              >
                Get share from Firestore
              </button>
            </div>
          }
          {keyshare1 ? (
            <div>
              <p>Local storage share: {keyshare1}</p>
            </div>
          ) : (
            () => {}
          )}
          {keyshare2 ? (
            <div>
              <p>Drive share: {keyshare2}</p>
            </div>
          ) : (
            () => {}
          )}
          {keyshare3 ? (
            <div>
              <p>Firebase: {keyshare3}</p>
            </div>
          ) : (
            () => {}
          )}
          {keyshare1 && keyshare2 ? (
            <button onClick={() => combineKeys(keyshare1, keyshare2)}>
              Combine keys
            </button>
          ) : (
            () => {}
          )}
          {keyCombine ? (
            <div>
              <p>Combined key: {keyCombine}</p>
            </div>
          ) : (
            () => {}
          )}
        </div>
      ) : (
        <div>
          <p>Share not found</p>
        </div>
      )}
    </div>
  );
};

export default Login;
