import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** true bila perangkat online (null dianggap online agar tidak berkedip saat start). */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        setOnline(s.isConnected !== false && s.isInternetReachable !== false);
      }),
    [],
  );
  return online;
}
