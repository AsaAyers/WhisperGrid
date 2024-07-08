import React from "react";
import { Navigate, useParams } from "react-router-dom";

export function GridRouter() {
  const { url } = useParams();

  const path = React.useMemo(() => {
    if (url) {
      const u = new URL(url);
      u.hostname = window.location.hostname;
      return u.pathname + u.search + u.hash;
    }
    return null;
  }, [url]);

  if (path) {
    return <Navigate to={path} replace={false} />;
  }
  return <div>Grid: {path ?? '(none)'}</div>;
}
