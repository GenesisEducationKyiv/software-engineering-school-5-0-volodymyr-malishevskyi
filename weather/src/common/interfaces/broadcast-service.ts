export interface IBroadcastService {
  broadcastWeatherUpdates(frequency: 'daily' | 'hourly'): Promise<void>;
}
