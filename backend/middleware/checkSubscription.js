import { User } from '../models.js';

export const checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const now = new Date();
    const hasValidSubscription = user.isSubscribed && user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > now;

    if (!hasValidSubscription) {
      // If flag was true but date has passed, update status
      if (user.isSubscribed) {
        user.isSubscribed = false;
        await user.save();
      }

      return res.status(403).json({
        message: 'Subscription expired. Please pay ₹20 for 15-day access.',
        isSubscribed: false,
        subscriptionExpiryDate: user.subscriptionExpiryDate,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({ message: 'Failed to verify subscription status.' });
  }
};
