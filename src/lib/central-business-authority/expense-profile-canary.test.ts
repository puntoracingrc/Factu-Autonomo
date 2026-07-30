import { describe, expect, it } from "vitest";

import {
  isCentralExpenseCanaryEnabledForUser,
  isCentralProfileCanaryEnabledForUser,
} from "./expense-profile-canary";

const userId = "dee25bc5-381c-40a7-9402-383d4b309052";

describe("expense and profile central canaries", () => {
  it("fail closed unless the feature and exact user are both enabled", () => {
    const environment = {
      expenseEnabled: "true",
      expenseUserIds: userId,
      profileEnabled: "true",
      profileUserIds: userId,
    };

    expect(isCentralExpenseCanaryEnabledForUser(userId, environment)).toBe(
      true,
    );
    expect(isCentralProfileCanaryEnabledForUser(userId, environment)).toBe(
      true,
    );
    expect(
      isCentralExpenseCanaryEnabledForUser("persianas-user", environment),
    ).toBe(false);
    expect(
      isCentralProfileCanaryEnabledForUser("persianas-user", environment),
    ).toBe(false);
  });

  it("does not treat a user list as activation by itself", () => {
    const environment = {
      expenseUserIds: userId,
      profileUserIds: userId,
    };

    expect(isCentralExpenseCanaryEnabledForUser(userId, environment)).toBe(
      false,
    );
    expect(isCentralProfileCanaryEnabledForUser(userId, environment)).toBe(
      false,
    );
  });
});
