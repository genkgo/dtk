let asyncFunc = async function () {
  let result = await Promise.resolve();
  return Promise.resolve();
};

function syncFunc () {
  return Promise.all([asyncFunc()]);
}

export default syncFunc;
