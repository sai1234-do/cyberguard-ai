
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("sentinelai.token");
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  getReportSummary() {
    return request("/api/reports/summary");
  },

  getAttackTypes() {
    return request("/api/reports/attack-types");
  },

  getSeveritySummary() {
    return request("/api/reports/severity");
  },

  getRiskSummary() {
    return request("/api/reports/risk");
  },

  getIncidents() {
    return request("/incidents/");
  },

  getIncident(incidentId) {
    return request(`/incidents/${incidentId}`);
  },

  analyzeIncident(incidentId) {
    return request(
      `/incidents/${incidentId}/analyze`,
      {
        method: "POST",
      }
    );
  },

  getIncidentEvents(incidentId) {
    return request(
      `/incidents/${incidentId}/events`
    );
  },

  getSecurityEvents({
    page = 1,
    pageSize = 20,
    search = "",
    severity = "",
    eventType = "",
    isSuspicious = "",
  } = {}) {
    const params = new URLSearchParams();

    params.set("page", page);
    params.set("page_size", pageSize);

    if (search) {
      params.set("search", search);
    }

    if (severity) {
      params.set("severity", severity);
    }

    if (eventType) {
      params.set("event_type", eventType);
    }

    if (isSuspicious !== "") {
      params.set("is_suspicious", isSuspicious);
    }

    return request(
      `/events?${params.toString()}`
    );
  },

  uploadSecurityCsv(file) {
    const formData = new FormData();

    formData.append("file", file);

    return request(
      "/events/upload",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  updateIncidentStatus(incidentId, status) {
    return request(
      `/incidents/${incidentId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
  },

  assignIncident(incidentId, assignedTo) {
    return request(
      `/incidents/${incidentId}/assign`,
      {
        method: "PATCH",
        body: JSON.stringify({
          assigned_to: assignedTo,
        }),
      }
    );
  },
};
