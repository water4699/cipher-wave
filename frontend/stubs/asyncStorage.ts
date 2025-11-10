// Stub for @react-native-async-storage/async-storage
// Required by MetaMask SDK when running in browser environment

const asyncStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => {},
  removeItem: async (_key: string): Promise<void> => {},
  clear: async (): Promise<void> => {},
  getAllKeys: async (): Promise<string[]> => [],
  multiGet: async (_keys: string[]): Promise<[string, string | null][]> => [],
  multiSet: async (_keyValuePairs: [string, string][]): Promise<void> => {},
  multiRemove: async (_keys: string[]): Promise<void> => {},
};

export default asyncStorage;
