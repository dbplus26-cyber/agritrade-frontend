// Edge runtime Sentry setup (the proxy and any edge route handlers).
import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

Sentry.init(sentryOptions);
