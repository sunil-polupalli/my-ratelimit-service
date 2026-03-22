db = db.getSiblingDB('ratelimitdb');

db.clients.insertMany([
  {
    clientId: "test-client-1",
    hashedApiKey: "$2b$10$Ep32Xf9Z5U.aD.yQeE8Z.e635G1/k/zS3w8Zq4X9x5V2z8y2u1o2K",
    maxRequests: 5,
    windowSeconds: 60,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    clientId: "test-client-2",
    hashedApiKey: "$2b$10$Ep32Xf9Z5U.aD.yQeE8Z.e635G1/k/zS3w8Zq4X9x5V2z8y2u1o2K",
    maxRequests: 50,
    windowSeconds: 120,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    clientId: "test-client-3",
    hashedApiKey: "$2b$10$Ep32Xf9Z5U.aD.yQeE8Z.e635G1/k/zS3w8Zq4X9x5V2z8y2u1o2K",
    maxRequests: 100,
    windowSeconds: 3600,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);