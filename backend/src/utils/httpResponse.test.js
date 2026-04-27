const test = require("node:test");
const assert = require("node:assert/strict");
const { sendSuccess, sendError } = require("./httpResponse");

function mockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };
}

test("sendSuccess returns expected format", () => {
  const res = mockResponse();
  sendSuccess(res, { data: { id: 1 }, meta: { page: 1 } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.deepEqual(res.payload.data, { id: 1 });
});

test("sendError returns expected format", () => {
  const res = mockResponse();
  sendError(res, { statusCode: 400, code: "BAD_REQUEST", message: "Invalid" });
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.ok, false);
  assert.equal(res.payload.error.code, "BAD_REQUEST");
});
