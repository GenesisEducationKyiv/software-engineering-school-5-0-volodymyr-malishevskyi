const API_URL = import.meta.env.VITE_API_URL + '/api';

export default {
	subscribe: async (email: string, city: string, frequency: 'daily' | 'hourly') => {
		return fetch(`${API_URL}/subscribe`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email,
				city,
				frequency,
			}),
		});
	},

	confirmSubscription: async (token: string) => {
		return fetch(`${API_URL}/confirm/${token}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
	},

	unsubscribe: async (token: string) => {
		return fetch(`${API_URL}/unsubscribe/${token}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
	},

	getWeatherByCity: async (city: string) => {
		return fetch(`${API_URL}/weather?city=${city}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
	},
};
