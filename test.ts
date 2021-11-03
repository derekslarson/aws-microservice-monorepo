/* eslint-disable @typescript-eslint/no-floating-promises */
import axios from "axios";

const url = "https://dereklarson-yac-auth-service.auth.us-east-1.amazoncognito.com/oauth2/authorize?identity_provider=Google&client_id=7qqd4vishpop8op593kf71qk2n&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fcallback&response_type=code&state=29f37e1a-58bb-48df-aa9a-f2cefa78dcd4&code_challenge=cHA62_z6ONJmi7qhVsEmC3Qbnxi6ApuB0Yb5O4mGjdM&code_challenge_method=S256&scope=yac%2Fuser.read%20yac%2Fuser.write%20yac%2Fuser.delete%20yac%2Ffriend.read%20yac%2Ffriend.write%20yac%2Ffriend.delete%20yac%2Fteam.read%20yac%2Fteam.write%20yac%2Fteam.delete%20yac%2Fteam_member.read%20yac%2Fteam_member.write%20yac%2Fteam_member.delete%20yac%2Fgroup.read%20yac%2Fgroup.write%20yac%2Fgroup.delete%20yac%2Fgroup_member.read%20yac%2Fgroup_member.write%20yac%2Fgroup_member.delete%20yac%2Fmeeting.read%20yac%2Fmeeting.write%20yac%2Fmeeting.delete%20yac%2Fmeeting_member.read%20yac%2Fmeeting_member.write%20yac%2Fmeeting_member.delete%20yac%2Fmessage.read%20yac%2Fmessage.write%20yac%2Fmessage.delete%20yac%2Fconversation.read%20yac%2Fconversation.write%20yac%2Fconversation.delete";

(async () => {
  try {
    const res = await axios.get(url, { maxRedirects: 0, validateStatus: (status) => status > 300 && status < 400 });

    console.log("res:\n", res);
  } catch (error) {
    console.log("error:\n", error);
  }
})();
