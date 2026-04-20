import { Navigate, Route, Routes } from "react-router-dom";
import { AppStateProvider, useAppState } from "./state/AppState";
import ApiKeyGate from "./screens/ApiKeyGate";
import Home from "./screens/Home";
import CreateStudy from "./screens/CreateStudy";
import EditStudy from "./screens/EditStudy";
import AudiencePicker from "./screens/Audience";
import InterviewPreview from "./screens/InterviewPreview";
import Pending from "./screens/Pending";
import Report from "./screens/Report";

function Gate({ children }: { children: React.ReactNode }) {
  const { apiKey } = useAppState();
  if (!apiKey) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route path="/setup" element={<ApiKeyGate />} />
        <Route
          path="/"
          element={
            <Gate>
              <Home />
            </Gate>
          }
        />
        <Route
          path="/create"
          element={
            <Gate>
              <CreateStudy />
            </Gate>
          }
        />
        <Route
          path="/study/:id/edit"
          element={
            <Gate>
              <EditStudy />
            </Gate>
          }
        />
        <Route
          path="/study/:id/audience"
          element={
            <Gate>
              <AudiencePicker />
            </Gate>
          }
        />
        <Route
          path="/study/:id/preview"
          element={
            <Gate>
              <InterviewPreview />
            </Gate>
          }
        />
        <Route
          path="/study/:id/pending"
          element={
            <Gate>
              <Pending />
            </Gate>
          }
        />
        <Route
          path="/study/:id/report"
          element={
            <Gate>
              <Report />
            </Gate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppStateProvider>
  );
}
