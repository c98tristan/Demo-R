import React, { useEffect, useState } from "react";
import { Wallet } from "ethers";
import { splitMnemonic, recoverMnemonic } from "shamir-bip39";

const User = () => {
  const [accessToken, setAccessToken] = useState("");
  const [fileId, setFileId] = useState("");
  const [profile, setProfile] = useState(null);
  const [shares, setShares] = useState();
  const [keyshare1, setKeyshare1] = useState();
  const [keyshare2, setKeyshare2] = useState();
  const [keyshare3, setKeyshare3] = useState();
  useEffect(() => {
    const handleAuthentication = async () => {
      const params = new URLSearchParams(window.location.hash.substr(1));
      const accessToken = params.get("access_token");

      if (!accessToken) {
        console.error("Access token not found in URL hash");
        return;
      }

      setAccessToken(accessToken);
    };

    handleAuthentication();
  }, []);

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

  const getUserProfile = async () => {
    try {
      // Fetch user profile
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log(response);

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const userData = await response.json();
      console.log(userData);
      setProfile(userData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const generateShare = () => {
    const wallet = Wallet.createRandom();

    const mnemonic = wallet.mnemonic.phrase;
    console.log(mnemonic);
    const shares = splitMnemonic(mnemonic, 3, 2);
    setShares(shares);
    console.log(shares);
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

  return (
    <div>
      {profile ? (
        <div>
          <button>Sign Out</button>

          <h3>User: {profile.name}</h3>
          <p>Email: {profile.email}</p>
          <p>User ID: {profile.id}</p>
        </div>
      ) : (
        <div>
          <button onClick={getUserProfile}>User Profile</button>
        </div>
      )}
      {shares ? (
        <div>
          <p>Share 1: {shares[1]}</p>
          <p>Share 2: {shares[2]}</p>
          <p>Share 3: {shares[3]}</p>
          <button
            onClick={() =>
              uploadEncryptedFileToAppDataFolder(shares[1], accessToken)
            }
          >
            Upload to Google Drive
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => generateShare()}>Generate Share</button>
        </div>
      )}
      {keyshare2 ? (
        <div>
          <p>Drive share: {keyshare2}</p>
        </div>
      ) : (
        <button onClick={() => getShareFromDrive(fileId)}>
          {" "}
          Get From Drive
        </button>
      )}
    </div>
  );
};

export default User;
