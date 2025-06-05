import { Router } from 'express';

import { SubscriptionController } from './subscription.controller';

const router = Router();

const subscriptionRouterFactory = (subscriptionController: SubscriptionController) => {
  router.post('/subscribe', subscriptionController.subscribe.bind(subscriptionController));
  router.get('/confirm/:token', subscriptionController.confirmSubscription.bind(subscriptionController));
  router.get('/unsubscribe/:token', subscriptionController.unsubscribe.bind(subscriptionController));

  return router;
};

export default subscriptionRouterFactory;
