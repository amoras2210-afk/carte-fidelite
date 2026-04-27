const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRewardState } = require("./loyaltyService");

test("buildRewardState computes rewards and remaining points", () => {
  const state = buildRewardState(23, 10);
  assert.equal(state.rewardsEarned, 2);
  assert.equal(state.pointsUntilNextReward, 7);
});

test("buildRewardState returns zero remaining when threshold reached", () => {
  const state = buildRewardState(20, 10);
  assert.equal(state.rewardsEarned, 2);
  assert.equal(state.pointsUntilNextReward, 0);
});
