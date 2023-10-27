import { w3mConnectors, w3mProvider } from '@web3modal/ethereum'
import { configureChains, createConfig } from 'wagmi'
import { goerli, polygonMumbai } from 'wagmi/chains'

export const walletConnectProjectId = '254bf30c9ea0de0d59a09c6fbe922626'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [goerli, polygonMumbai],
  [w3mProvider({ projectId: walletConnectProjectId })],
)

export const config = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({
    chains,
    projectId: walletConnectProjectId,
    version: 2,
  }),
  publicClient,
  webSocketPublicClient,
})

export { chains }
