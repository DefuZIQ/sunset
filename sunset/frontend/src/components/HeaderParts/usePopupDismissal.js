import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function usePopupDismissal() {
  const location = useLocation();
  const previousLocation = useRef(null);
  const [dismissed, setDismissed] = useState(false);
  const route = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (previousLocation.current !== null && previousLocation.current !== route) {
      setDismissed(true);
    }
    previousLocation.current = route;
  }, [route]);

  return {
    dismissed,
    dismiss: () => setDismissed(true),
    reopen: () => setDismissed(false),
  };
}
