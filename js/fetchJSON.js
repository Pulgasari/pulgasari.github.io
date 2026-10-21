//
const fetchJSON = async (url) => {
  const text = await fetch(url);
  const json = await text.json();
  return json;
};

// as Oneliner
const fetchJSON = async (url) => ( await fetch(url) ).json();
