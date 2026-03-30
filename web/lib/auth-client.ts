import {
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    inferAdditionalFields({
      user: {
        username: {
          type: "string",
          required: true,
          returned: true,
          unique: true,
          sortable: true,
        },
      },
    }),
  ],
});
