import NetInfo from '@react-native-community/netinfo';

export class NetworkService {
  private static listeners: ((isOnline: boolean) => void)[] = [];
  private static isOnline: boolean = false;

  static async initialize() {
    // Get initial network state
    const state = await NetInfo.fetch();

    this.isOnline = state.isConnected === true && state.isInternetReachable !== false;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      console.log('Network state changed:', state); // Debug log

      const newIsOnline = state.isConnected === true && state.isInternetReachable !== false;
      console.log('New online status:', newIsOnline);

      if (newIsOnline !== this.isOnline) {
        this.isOnline = newIsOnline;
        this.notifyListeners(newIsOnline);
      }
    });
  }

  static addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    callback(this.isOnline);

    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private static notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  static getIsOnline(): boolean {
    return this.isOnline;
  }

  static setOnlineStatus(isOnline: boolean) {
    if (isOnline !== this.isOnline) {
      this.isOnline = isOnline;
      this.notifyListeners(isOnline);
    }
  }
}