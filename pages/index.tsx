import type { NextPage } from "next";
import { ethers } from "ethers";
import abi from "@/utils/abi.json";
import { useState, useEffect } from "react";
import Head from "next/head";
import {
  getAuth,
  signInWithPopup,
  GithubAuthProvider,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";
import { app } from "../firebase";

interface CustomUser extends User {
  accessToken?: string;
}

interface CustomWindow extends Window {
  ethereum?: any;
}

// Contract Address & ABI
const contractAddress = process.env
  .NEXT_PUBLIC_SMART_CONTRACT_ADDRESS as string;
const contractABI = abi;

const Home: NextPage = () => {
  const [userAccessToken, setUserAccessToken] = useState<string | undefined>(
    ""
  );
  const auth = getAuth(app);
  (async () => {
    await setPersistence(auth, browserLocalPersistence);
  })();
  const user: CustomUser | null = auth.currentUser;
  const provider = new GithubAuthProvider();

  const loginLogout = async () => {
    if (user && user.accessToken) {
      await signOut(auth);
      setUserAccessToken("");
    } else {
      signInWithPopup(auth, provider)
        .then(async (result) => {
          const user: CustomUser = result.user;
          console.log(user);
          setUserAccessToken(user.accessToken);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  useEffect(() => {
    if (user?.accessToken) {
      setUserAccessToken(user.accessToken);
    }
    auth.onAuthStateChanged((user: CustomUser | null) => {
      if (user && user.accessToken) {
        setUserAccessToken(user.accessToken);
      }
    });
  }, []);

  const isWalletConnected = async () => {
    try {
      const customWindow: CustomWindow = window;
      const { ethereum } = customWindow;

      const accounts = await ethereum.request({ method: "eth_accounts" });
      console.log("accounts: ", accounts);

      if (accounts.length > 0) {
        const account = accounts[0];
        console.log("wallet is connected! " + account);
      } else {
        console.log("make sure MetaMask is connected");
      }
    } catch (error) {
      console.log("error: ", error);
    }
  };

  useEffect(() => {
    let zkSubmissions: ethers.Contract;
    isWalletConnected();

    // Create an event handler function for when someone sends
    // us a new memo.
    const onNewSubmission = (from: string, message: string) => {
      console.log("Submission received: ", from, message);
    };

    const customWindow: CustomWindow = window;
    const { ethereum } = customWindow;

    // Listen for new memo events.
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum, "any");
      const signer = provider.getSigner();
      zkSubmissions = new ethers.Contract(contractAddress, contractABI, signer);

      zkSubmissions.on("NewSubmission", onNewSubmission);

      const filter = {
        address: contractAddress,
        fromBlock: 0,
        toBlock: "latest",
        topics: [ethers.utils.id("NewSubmission(address,string)")],
      };

      provider.getLogs(filter).then((logs) => {
        const result = logs.map((log) => {
          const decodedLog = zkSubmissions.interface.decodeEventLog(
            "NewSubmission",
            log.data,
            log.topics
          );
          return {
            from: decodedLog.sender,
            message: decodedLog.message,
          };
        });
        console.log(result);
      });
    }

    return () => {
      if (zkSubmissions) {
        zkSubmissions.off("NewSubmission", onNewSubmission);
      }
    };
  }, []);

  useEffect(() => {
    console.log(user);
  }, [user]);

  return (
    <div>
      <Head>
        <title>Next.js + ZKEVM</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section>
        <header>
          <h2>#zkThon</h2>
        </header>
        <section>
          <section></section>
          <section></section>
        </section>
      </section>
    </div>
  );
};

export default Home;
