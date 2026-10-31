import { Bell, LogOut, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./AppTopbar.css";

export default function AppTopbar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { operator, signOut } = useAuth();
  const initials = operator?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SO";
  const submitSearch = (event) => { event.preventDefault(); if (query.trim()) navigate(`/events?q=${encodeURIComponent(query.trim())}`); };

  return <header className="app-topbar"><form className="global-search" onSubmit={submitSearch}><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, users, IPs, assets..." aria-label="Search security data" /></form><div><button type="button" className="notification-button" aria-label="Notifications"><Bell size={18}/><i/></button><span className="analyst-avatar">{initials}</span><p><strong>{operator?.name || "Security Operator"}</strong><small>SECURITY ANALYST</small></p><button type="button" className="signout-button" onClick={() => { signOut(); navigate("/login"); }} aria-label="Sign out"><LogOut size={16}/></button></div></header>;
}
