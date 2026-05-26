import { readFile } from "node:fs/promises";
import { GoogleAuth } from "google-auth-library";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    return [key, valueParts.join("=")];
  })
);

const projectId = args.project || "servicios-maps";
const databaseId = args.database || "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1";
const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const rulesPath = args.rules || "firestore.rules";

if (!serviceAccountPath) {
  throw new Error("Missing --serviceAccount=/absolute/path/service-account.json");
}

const rules = await readFile(rulesPath, "utf8");
const auth = new GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});
const client = await auth.getClient();

async function request(method, url, body) {
  const response = await client.request({
    method,
    url,
    data: body,
    validateStatus: () => true
  });

  if (response.status < 200 || response.status >= 300) {
    const details = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    const error = new Error(`${method} ${url} failed with ${response.status}: ${details}`);
    error.status = response.status;
    throw error;
  }

  return response.data;
}

const ruleset = await request(
  "POST",
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
  {
    source: {
      files: [
        {
          name: "firestore.rules",
          content: rules
        }
      ]
    }
  }
);

const releaseName = `projects/${projectId}/releases/cloud.firestore/${databaseId}`;
try {
  await request("PATCH", `https://firebaserules.googleapis.com/v1/${releaseName}`, {
    release: {
      name: releaseName,
      rulesetName: ruleset.name
    },
    updateMask: "rulesetName"
  });
} catch (error) {
  if (error.status !== 404) {
    throw error;
  }

  await request("POST", `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
    release: {
      name: releaseName,
      rulesetName: ruleset.name
    }
  });
}

console.log(`Deployed ${ruleset.name} to ${releaseName}`);
