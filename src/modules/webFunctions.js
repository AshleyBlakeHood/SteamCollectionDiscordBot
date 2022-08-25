const axios = require("axios");

module.exports.getPage = (pageUrl) => {
  return axios
    .get(pageUrl, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
    .then((res) => res.data);
};
