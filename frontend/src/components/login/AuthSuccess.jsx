import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notifyAuthChanged } from "../../utils/appClient";
export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      notifyAuthChanged();
      navigate("/", { replace: true });
      return;
}

    navigate("/login");
  }, [navigate]);

  return <div className="p-8 text-center">Conectando...</div>;
}
