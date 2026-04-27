function buildRewardState(totalPoints, rewardThreshold) {
  const safeThreshold = Math.max(1, Number(rewardThreshold || 10));
  const rewardsEarned = Math.floor(totalPoints / safeThreshold);
  const remainder = totalPoints % safeThreshold;
  const pointsUntilNextReward = remainder === 0 ? 0 : safeThreshold - remainder;

  return {
    rewardsEarned,
    pointsUntilNextReward
  };
}

module.exports = {
  buildRewardState
};
