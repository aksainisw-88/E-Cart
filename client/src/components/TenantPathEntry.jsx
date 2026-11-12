import { Navigate, useParams } from "react-router-dom";

const TenantPathEntry = ({ redirectTo }) => {
  const { tenantSlug = "" } = useParams();
  return <Navigate to={`${redirectTo}?store=${encodeURIComponent(tenantSlug)}`} replace />;
};

export default TenantPathEntry;
