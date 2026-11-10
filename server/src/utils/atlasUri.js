const parseAtlasUri = (uri) => {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Enter a valid MongoDB Atlas connection URI.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split(".");
  const isAtlasHost = labels.length >= 3
    && labels.at(-2) === "mongodb"
    && labels.at(-1) === "net"
    && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("Enter a valid MongoDB Atlas database name.");
  }
  const allowedOptions = new Set(["retrywrites", "w", "appname", "authsource"]);
  const optionsAllowed = [...parsed.searchParams.keys()].every((key) => allowedOptions.has(key.toLowerCase()));
  const safeWriteConcern = [...parsed.searchParams.entries()].every(([key, value]) => {
    if (key.toLowerCase() === "w") return value.toLowerCase() === "majority";
    if (key.toLowerCase() === "retrywrites") return value.toLowerCase() === "true";
    return true;
  });
  if (
    parsed.protocol !== "mongodb+srv:"
    || !isAtlasHost
    || parsed.port
    || !parsed.username
    || !parsed.password
    || parsed.hash
    || !/^[a-zA-Z0-9_-]{1,63}$/.test(databaseName)
    || ["admin", "local", "config"].includes(databaseName.toLowerCase())
    || !optionsAllowed
    || !safeWriteConcern
  ) {
    throw new Error("Use a MongoDB Atlas SRV URI with credentials and a customer database name. Only standard Atlas options are allowed.");
  }
  return databaseName;
};

module.exports = { parseAtlasUri };
