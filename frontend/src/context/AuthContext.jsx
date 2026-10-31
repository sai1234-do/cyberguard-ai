
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext();

const storageKey = "sentinelai.operator";
const tokenKey = "sentinelai.token";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getStoredOperator() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState(getStoredOperator);

  const signIn = async ({ name, email, password }) => {
    const formData = new URLSearchParams();

    formData.append("username", email.trim());
    formData.append("password", password);

    const response = await fetch(
      `${API_BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      let message = "Authentication failed.";

      try {
        const data = await response.json();
        message = data.detail || message;
      } catch {
        // Keep default message if response is not JSON.
      }

      throw new Error(message);
    }

    const tokenData = await response.json();

    localStorage.setItem(tokenKey, tokenData.access_token);

    const meResponse = await fetch(
      `${API_BASE_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!meResponse.ok) {
      localStorage.removeItem(tokenKey);
      throw new Error("Unable to retrieve authenticated user.");
    }

    const user = await meResponse.json();

    const authenticatedOperator = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    // Updating this state triggers SecurityContext's data-loading effect.
    setOperator(authenticatedOperator);

    return authenticatedOperator;
  };

  const signOut = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(storageKey);
    setOperator(null);
  };

  useEffect(() => {
    if (operator) {
      localStorage.setItem(
        storageKey,
        JSON.stringify(operator)
      );
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [operator]);

  const value = useMemo(
    () => ({
      operator,
      signIn,
      signOut,
      token: getStoredToken(),
    }),
    [operator]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
