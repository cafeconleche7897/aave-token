import { BigNumber as BigNumberJS } from "bignumber.js";
import { BigNumber, Wallet, ContractTransaction } from "ethers";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import { HardhatRuntimeEnvironment } from "hardhat/types"; // Updated dependency name
import { WAD } from "./constants";
import { iParamsPerNetwork, eEthereumNetwork } from "./types";

// NOTE: Hardhat/Ethers.js provides its own BigNumber implementation. 
// We use BigNumberJS (from bignumber.js) here primarily for arithmetic precision 
// before converting back to Ethers BigNumber or string for contract interaction.

// --- Configuration and Environment Setup ---

// Default path for contract addresses persistence
export const getDb = () => low(new FileSync("./deployed-contracts.json"));

// Using a type alias for the global environment, which should ideally be passed around, 
// not stored globally (see comment below).
export type HRE = HardhatRuntimeEnvironment;

// WARNING: Storing HRE globally is risky. It's better to pass it as an argument 
// to functions that need it (e.g., evmSnapshot).
// If absolutely necessary, keep the setter/getter pattern:
export let hre: HRE = {} as HRE;
export const setHRE = (_hre: HRE) => {
    hre = _hre;
};

// --- Conversion and Utility Functions ---

/**
 * Converts a standard decimal value (e.g., '1.0' or 1) into a WAD (1e18) string format.
 * This is crucial for interacting with Aave/Compound-like protocols.
 * @param value The value to convert (e.g., 1.23)
 * @returns The WAD representation as a string (e.g., '1230000000000000000')
 */
export const toWad = (value: string | number): string =>
  new BigNumberJS(value).times(WAD).toFixed(0); // Ensure no decimals in the final integer string

/**
 * Converts an Ethers BigNumber to BigNumberJS for high-precision arithmetic.
 * @param amount The Ethers BigNumber object.
 * @returns The BigNumberJS object.
 */
export const ethersBnToBigNumberJS = (amount: BigNumber): BigNumberJS =>
  new BigNumberJS(amount.toString());

/**
 * Converts a string amount to BigNumberJS for high-precision arithmetic.
 * @param amount The amount as a string.
 * @returns The BigNumberJS object.
 */
export const stringToBigNumberJS = (amount: string): BigNumberJS =>
  new BigNumberJS(amount);

/**
 * Retrieves the correct parameter value based on the current Ethereum network environment.
 * @param params Object containing network-specific parameters.
 * @param network The current network enum.
 * @returns The parameter value for the specified network.
 */
export const getParamByNetwork = <T>(
  { kovan, ropsten, main, buidlerevm, coverage }: iParamsPerNetwork<T>,
  network: eEthereumNetwork
): T => {
  switch (network) {
    case eEthereumNetwork.coverage:
      return coverage;
    case eEthereumNetwork.buidlerevm:
      return buidlerevm;
    case eEthereumNetwork.kovan:
      return kovan;
    case eEthereumNetwork.ropsten:
      return ropsten;
    case eEthereumNetwork.main:
      return main;
    default:
      // Defaulting to 'main' is acceptable if the configuration ensures 'main' always exists.
      return main;
  }
};

/**
 * Pauses execution for a specified number of milliseconds.
 * @param milliseconds Time to sleep.
 */
export const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/**
 * Creates a new randomly generated Ethereum wallet and returns its address.
 * @returns A randomly generated Ethereum address.
 */
export const createRandomAddress = (): string => Wallet.createRandom().address;

/**
 * Waits for a transaction to be mined and returns the receipt.
 * @param tx The contract transaction promise.
 * @returns The transaction receipt.
 */
export const waitForTx = async (tx: ContractTransaction) => await tx.wait();


// --- EVM Manipulation Functions (Require HRE/hre to be set) ---

/**
 * Creates a snapshot of the current EVM state.
 * @returns The snapshot ID as a string.
 */
export const evmSnapshot = async (): Promise<string> => 
  await hre.ethers.provider.send("evm_snapshot", []);

/**
 * Reverts the EVM to a previously saved snapshot.
 * @param id The ID of the snapshot to revert to.
 */
export const evmRevert = async (id: string): Promise<void> => 
  await hre.ethers.provider.send("evm_revert", [id]);

/**
 * Gets the timestamp of the latest mined block.
 * @returns The timestamp as a BigNumberJS object.
 */
export const timeLatest = async (): Promise<BigNumberJS> => {
  const block = await hre.ethers.provider.getBlock("latest");
  // Use BigNumberJS for potential large timestamps
  return new BigNumberJS(block.timestamp); 
};

/**
 * Mines a new block with a specific timestamp.
 * @param timestamp The Unix timestamp for the new block.
 */
export const advanceBlock = async (timestamp: number): Promise<void> =>
  await hre.ethers.provider.send("evm_mine", [timestamp]);

/**
 * Increases the EVM's block time by a specified number of seconds.
 * Note: A subsequent block mine is needed to activate the time increase.
 * @param secondsToIncrease The number of seconds to advance the time by.
 */
export const increaseTime = async (secondsToIncrease: number): Promise<void> =>
  await hre.ethers.provider.send("evm_increaseTime", [secondsToIncrease]);
