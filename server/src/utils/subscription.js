const Subscription = require("../models/Subscription");
const User = require("../models/User");
const crypto = require("crypto");

const today = () => new Date().toISOString().slice(0, 10);

const getSubscriptionForUser = async (user) => {
  let ownerId = user.role === "admin" ? user._id || user.id : user.subscriptionOwner;
  if (!ownerId && user.role !== "admin") {
    const admins = await User.find({ role: "admin" }).select("_id").limit(2).lean();
    ownerId = admins.length === 1 ? admins[0]._id : null;
  }

  if (!ownerId) return null;
  const owner = await User.findOne({ _id: ownerId, role: "admin" })
    .select("email role subscriptionRegistrationNumber +subscriptionKeyHash")
    .lean();
  if (!owner) return null;
  const subscription = await Subscription.findOne({ email: owner.email })
    .select("+licenseKeyHash")
    .lean();
  if (!subscription) return null;

  const currentDate = today();
  const storedHash = Buffer.from(owner.subscriptionKeyHash || "", "hex");
  const currentHash = Buffer.from(subscription.licenseKeyHash, "hex");
  const keyMatches = storedHash.length === currentHash.length
    && storedHash.length > 0
    && crypto.timingSafeEqual(storedHash, currentHash);
  const registrationMatches = owner.subscriptionRegistrationNumber === subscription.registrationNumber;
  const valid = subscription.status === "Active"
    && subscription.validFrom <= currentDate
    && subscription.validTill >= currentDate;
  const active = valid && keyMatches && registrationMatches;

  return {
    id: subscription._id.toString(),
    registrationNumber: subscription.registrationNumber,
    status: subscription.status === "Suspended"
      ? "Suspended"
      : subscription.validTill < currentDate
        ? "Expired"
        : subscription.status,
    validFrom: subscription.validFrom,
    validTill: subscription.validTill,
    active,
  };
};

module.exports = { getSubscriptionForUser, today };
