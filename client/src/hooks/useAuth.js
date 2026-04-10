import { useContext } from "react";
import { AuthContext } from "../context/AuthContextObject";

const useAuth = () => useContext(AuthContext);

export default useAuth;
