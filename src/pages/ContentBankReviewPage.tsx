import { Navigate, useParams } from 'react-router-dom';
import { CONTENT_BANK_BASE, contentBankBatchPath } from '@/navigation/contentBankRoutes';

/**
 * Backwards-compatible route for old Review & Export bookmarks.
 *
 * Review now lives only inside Batch Workspace. Keeping this route as a redirect
 * avoids breaking saved links while guaranteeing there is one review UI and one
 * export implementation.
 */
export default function ContentBankReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  return <Navigate to={batchId ? contentBankBatchPath(batchId) : CONTENT_BANK_BASE} replace />;
}
