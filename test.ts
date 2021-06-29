const key = { pk: "test", sk: "val" };

// console.log(Buffer.from(JSON.stringify(key)).toString("base64"));

console.log(Buffer.from("eyJwayI6InRlc3QiLCJzayI6InZhbCJ9", "base64").toString());
