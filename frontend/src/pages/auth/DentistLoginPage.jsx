import RoleLoginForm from '../../components/auth/RoleLoginForm';
import { ROLES } from '../../utils/constants';

export default function DentistLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-sky-100 p-4">
      <RoleLoginForm
        role={ROLES.DENTIST}
        title="Dentist Login"
        subtitle="Staff Portal"
      />
    </div>
  );
}
