import { Web3Button } from "@web3modal/react";
import { useState, useEffect } from "react";
import {
  Address,
  BaseError,
  encodePacked,
  etherUnits,
  parseEther,
  parseUnits,
} from "viem";
import { polygonMumbai, goerli } from "viem/chains";
import toast from "react-hot-toast";
import {
  erc20ABI,
  useAccount,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import useWebSocket from "react-use-websocket";
import { EXCHANGE_ADDR, USDC_ADDR } from "./contracts";
import ExchangeABI from "./contracts/Exchange.json";
import chainIds from "./constants/chainId";

export function App() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [balance, setBalance] = useState(0);
  const [to, setTo] = useState("");
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const [messages, setMessages] = useState<any>([]);

  const { lastMessage } = useWebSocket("ws://127.0.0.1:8000", {
    onOpen: () => {
      console.log("Websocket Connection Established");
    },
  });

  useEffect(() => {
    if (lastMessage) {
      setMessages([...messages, lastMessage.data]);
    }
  }, [lastMessage]);

  console.log(lastMessage);

  const onDeposit = async (chainId: number) => {
    if (chain?.id !== chainId) {
      await switchNetworkAsync?.(chainId);
    }
    if (!walletClient) return;

    try {
      const amount = parseUnits(`${balance}`, 6);
      const { request } = await publicClient.simulateContract({
        account: address,
        address: USDC_ADDR[chainId as 5 | 80001] as Address,
        abi: erc20ABI,
        functionName: "approve",
        args: [EXCHANGE_ADDR[chainId as 5 | 80001] as Address, amount],
      });
      const txHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const adapterParams = encodePacked(
        ["uint16", "uint256"],
        [1, 150000000n]
      );

      const fee = await publicClient.readContract({
        address: EXCHANGE_ADDR[chainId as 5 | 80001] as Address,
        abi: ExchangeABI,
        functionName: "estimateDepositFee",
        args: [chainIds[chainId as 5 | 80001], amount, false, adapterParams],
      });

      console.log(fee);

      const { request: depositRequest } = await publicClient.simulateContract({
        account: address,
        address: EXCHANGE_ADDR[chainId as 5 | 80001] as Address,
        abi: ExchangeABI as any,
        functionName: "deposit",
        args: [amount],
        value: ((fee as any)?.[0] ?? 0n) as bigint,
      });

      const depositTxHash = await walletClient.writeContract(depositRequest);
      await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
    } catch (err) {
      console.log(err);
      toast.error(
        err instanceof BaseError ? err.shortMessage : JSON.stringify(err)
      );
    }
  };

  const onExchange = async (chainId: number) => {
    if (chain?.id !== chainId) {
      await switchNetworkAsync?.(chainId);
    }
    if (!walletClient) return;

    try {
      const amount = parseUnits(`${balance}`, 6);

      const adapterParams = encodePacked(
        ["uint16", "uint256"],
        [1, 150000000n]
      );

      const fee = await publicClient.readContract({
        address: EXCHANGE_ADDR[chainId as 5 | 80001] as Address,
        abi: ExchangeABI,
        functionName: "estimateExchangeFee",
        args: [
          chainIds[chainId as 5 | 80001],
          amount,
          to,
          false,
          adapterParams,
        ],
      });

      const { request: excRequest } = await publicClient.simulateContract({
        account: address,
        address: EXCHANGE_ADDR[chainId as 5 | 80001] as Address,
        abi: ExchangeABI as any,
        functionName: "exchange",
        args: [amount, to],
        value: ((fee as any)?.[0] ?? 0n) as bigint,
      });

      const exctxHash = await walletClient.writeContract(excRequest);
      await publicClient.waitForTransactionReceipt({ hash: exctxHash });
    } catch (err) {
      console.log(err);
      toast.error(
        err instanceof BaseError ? err.shortMessage : JSON.stringify(err)
      );
    }
  };

  return (
    <>
      <Web3Button />
      <div>
        amount:{" "}
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.valueAsNumber)}
        />
      </div>
      <div>
        to:{" "}
        <input type="text" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div>
        <button onClick={() => onExchange(goerli.id)}>
          Exchange On Goerli
        </button>
        <button onClick={() => onExchange(polygonMumbai.id)}>
          Exchange On Mumbai
        </button>
      </div>
      <div>
        <button onClick={() => onDeposit(goerli.id)}>Deposit To Goerli</button>
        <button onClick={() => onDeposit(polygonMumbai.id)}>
          Deposit To Mumbai
        </button>
      </div>
      <ul>
        {messages?.map((item: any, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}
