import { useEffect, useRef, useState } from "react";

const useFetch = (fetcher, deps = [], options = {}) => {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(immediate));
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = async () => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError("");
      }

      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Request failed";
      if (mountedRef.current) {
        setError(message);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, refetch: run };
};

export default useFetch;
