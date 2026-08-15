import { routePublicRequest } from './router.mjs';

export default {
  fetch(request, env, context) {
    return routePublicRequest(request, env, context);
  },
};
