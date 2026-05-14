const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const User = require('../models/User');
const { trackEvent } = require('../services/activity.service');
const { trackDailyLogin } = require('../services/dailyAnalytics.service');
const { mergeSignupContext, platformFromUserAgent } = require('../utils/signupContext');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const normalizeEmail = (email) => email.trim().toLowerCase();
const isAdminEmail = (email) => Boolean(ADMIN_EMAIL) && normalizeEmail(email) === ADMIN_EMAIL;

const createToken = (user, jti) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      userId: user.userId,
      email: user.email,
      role: user.role || 'user',
      jti,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const toUserResponse = (user) => ({
  id: user._id.toString(),
  userId: user.userId,
  fullName: user.fullName || user.userId || user.email,
  email: user.email,
  role: user.role || 'user',
  isActive: user.isActive !== false,
  trackingEnabled: user.trackingEnabled !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createPublicUserId = async () => {
  let userId = '';
  while (!userId) {
    const candidate = `MBX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await User.findOne({ userId: candidate }).lean();
    if (!existing) userId = candidate;
  }
  return userId;
};

exports.signup = async (req, res, next) => {
  try {
    const { fullName, email, password, signupContext: signupCtxBody } = req.body || {};
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email, and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) return res.status(409).json({ message: 'Email already exists' });

    const finalUserId = await createPublicUserId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = isAdminEmail(normalizedEmail) ? 'admin' : 'user';

    const jti = randomUUID();
    const ua = req.get('user-agent') || '';
    const user = await User.create({
      userId: finalUserId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      signupContext: mergeSignupContext(null, signupCtxBody || {}, req),
      sessions: [{
        tokenId: jti,
        userAgent: ua,
        platform: platformFromUserAgent(ua),
        ip: req.ip || '',
        loggedInAt: new Date(),
      }],
    });

    await trackEvent(user._id, 'SIGNUP', { email: user.email });

    res.status(201).json({
      message: 'Account created successfully',
      user: toUserResponse(user),
      token: createToken(user, jti),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password, signupContext: signupCtxBody } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ message: 'identifier and password are required' });
    }

    const lookup = identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: lookup.toLowerCase() }, 
        { userId: lookup.toUpperCase() },
        { userId: lookup }
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is inactive. Contact admin.' });
    }

    const jti = randomUUID();
    const token = createToken(user, jti);

    const ua = req.get('user-agent') || '';
    const sessionInfo = {
      tokenId: jti,
      userAgent: ua,
      platform: platformFromUserAgent(ua),
      ip: req.ip || '',
      loggedInAt: new Date(),
    };

    const setPayload = {
      sessions: [sessionInfo],
      signupContext: mergeSignupContext(user, signupCtxBody || {}, req),
    };

    // Har login pe sirf ek session rakho — purane sab clear; device context refresh
    await User.updateOne({ _id: user._id }, { $set: setPayload })
    if (user.trackingEnabled !== false) {
      await trackEvent(user._id, 'LOGIN', { ip: req.ip });
      await trackDailyLogin(user._id, new Date());
    }

    res.json({ user: toUserResponse(user), token });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user.sub },
      { $pull: { sessions: { tokenId: req.user.jti } } }
    );
    await trackEvent(req.user.sub, 'LOGOUT');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.sub).select('password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    const same = await bcrypt.compare(newPassword, user.password);
    if (same) return res.status(400).json({ message: 'New password must be different from the current password' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: req.user.sub }, { $set: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
