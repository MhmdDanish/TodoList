import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useSync } from './useSync';

export function useNetworkStatus() {
  const { setOnlineStatus } = useSync();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      setOnlineStatus(isOnline);
    });

    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      setOnlineStatus(isOnline);
    });

    return unsubscribe;
  }, [setOnlineStatus]);

  return {};
}
