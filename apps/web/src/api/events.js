import { apiClient } from './client';
export const fetchEventsAnalytics = async (params) => {
    const response = await apiClient.get('/api/events', {
        params: {
            period: params.period,
            projectId: params.projectId ?? undefined,
            linkId: params.linkId ?? undefined,
            page: params.page,
            pageSize: params.pageSize,
            filters: params.filters
        }
    });
    return response.data.analytics;
};
