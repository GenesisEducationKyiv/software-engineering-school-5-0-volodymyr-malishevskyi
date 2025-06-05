import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import Confirmation from './Confirmation.vue';
import Unsubscribe from './Unsubscribe.vue';
import Weather from './Weather.vue';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		name: 'Weather',
		component: Weather,
	},
	{
		path: '/api/confirm/:token',
		name: 'Confirmation',
		component: Confirmation,
	},
	{
		path: '/api/unsubscribe/:token',
		name: 'Unsubscribe',
		component: Unsubscribe,
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;
