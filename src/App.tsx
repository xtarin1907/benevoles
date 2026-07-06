import { Navigate, Route, Routes } from "react-router-dom"
import { RequireManifestationAccess } from "@/lib/auth/guards"
import LandingPage from "@/pages/Landing"
import OrganizersPage from "@/pages/Organizers"
import PartnersPage from "@/pages/Partners"
import LoginPage from "@/pages/Login"
import SignupPage from "@/pages/Signup"
import UpdatePasswordPage from "@/pages/UpdatePassword"
import AuthCallbackPage from "@/pages/AuthCallback"
import ManifestationDetailPage from "@/pages/ManifestationDetail"
import LegalNoticePage from "@/pages/legal/LegalNotice"
import PrivacyPage from "@/pages/legal/Privacy"
import TermsPage from "@/pages/legal/Terms"
import DashboardLayout from "@/pages/dashboard/Layout"
import DashboardProfilePage from "@/pages/dashboard/Profile"
import EngagementsPage from "@/pages/dashboard/Engagements"
import SignupsPage from "@/pages/dashboard/Signups"
import PointsPage from "@/pages/dashboard/Points"
import ManageLayout from "@/pages/manage/Layout"
import ManageListPage from "@/pages/manage/List"
import NewManifestationSelfServePage from "@/pages/manage/NewManifestation"
import ManageDetailPage from "@/pages/manage/Detail"
import SecteursPage from "@/pages/manage/Secteurs"
import ShiftsPage from "@/pages/manage/Shifts"
import ShiftDetailPage from "@/pages/manage/ShiftDetail"
import ManageVolunteersPage from "@/pages/manage/Volunteers"
import NewsletterPage from "@/pages/manage/Newsletter"
import RemindersPage from "@/pages/manage/Reminders"
import BlacklistPage from "@/pages/manage/Blacklist"
import AdminLayout from "@/pages/admin/Layout"
import AdminManifestationsPage from "@/pages/admin/Manifestations"
import NewManifestationPage from "@/pages/admin/NewManifestation"
import VolunteersPage from "@/pages/admin/Volunteers"
import AdminPartnersPage from "@/pages/admin/Partners"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/organisateurs" element={<OrganizersPage />} />
      <Route path="/partenaires" element={<PartnersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/manifestations/:id" element={<ManifestationDetailPage />} />
      <Route path="/mentions-legales" element={<LegalNoticePage />} />
      <Route path="/confidentialite" element={<PrivacyPage />} />
      <Route path="/cgu" element={<TermsPage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardProfilePage />} />
        <Route path="engagements" element={<EngagementsPage />} />
        <Route path="signups" element={<SignupsPage />} />
        <Route path="points" element={<PointsPage />} />
      </Route>

      <Route path="/manage" element={<ManageLayout />}>
        <Route index element={<ManageListPage />} />
        <Route path="new" element={<NewManifestationSelfServePage />} />
        <Route path="blacklist" element={<BlacklistPage />} />
        <Route
          path=":id"
          element={
            <RequireManifestationAccess>
              <ManageDetailPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/secteurs"
          element={
            <RequireManifestationAccess>
              <SecteursPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/shifts"
          element={
            <RequireManifestationAccess>
              <ShiftsPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/shifts/:shiftId"
          element={
            <RequireManifestationAccess>
              <ShiftDetailPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/volunteers"
          element={
            <RequireManifestationAccess>
              <ManageVolunteersPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/newsletter"
          element={
            <RequireManifestationAccess>
              <NewsletterPage />
            </RequireManifestationAccess>
          }
        />
        <Route
          path=":id/reminders"
          element={
            <RequireManifestationAccess>
              <RemindersPage />
            </RequireManifestationAccess>
          }
        />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/manifestations" replace />} />
        <Route path="manifestations" element={<AdminManifestationsPage />} />
        <Route path="manifestations/new" element={<NewManifestationPage />} />
        <Route path="volunteers" element={<VolunteersPage />} />
        <Route path="partners" element={<AdminPartnersPage />} />
      </Route>
    </Routes>
  )
}
