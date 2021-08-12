import AcsPopulationProvider from "../variables/AcsPopulationProvider";
import Acs2010PopulationProvider from "../variables/Acs2010PopulationProvider";
import VariableProvider from "../variables/VariableProvider";
import CdcCovidProvider from "../variables/CdcCovidProvider";
import BrfssProvider from "../variables/BrfssProvider";
import { MetricId } from "../config/MetricConfig";
import AcsHealthInsuranceProvider from "../variables/AcsHealthInsuranceProvider";
import AcsPovertyProvider from "../variables/AcsPovertyProvider";
import CdcVaccineNationalProvider from "../variables/CdcVaccineNationalProvider";

export type ProviderId =
  | "acs_health_insurance_provider"
  | "acs_pop_provider"
  | "acs_poverty_provider"
  | "cdc_covid_provider"
  | "cdc_vaccine_national_provider"
  | "covid_provider"
  | "brfss_provider"
  | "acs_2010_pop_provider";

export default class VariableProviderMap {
  private providers: VariableProvider[];
  private providersById: Record<ProviderId, VariableProvider>;
  private metricsToProviderIds: Record<MetricId, ProviderId>;

  constructor() {
    const acsProvider = new AcsPopulationProvider();
    const acs2010Provider = new Acs2010PopulationProvider();
    this.providers = [
      acsProvider,
      acs2010Provider,
      new CdcCovidProvider(acsProvider, acs2010Provider),
      new BrfssProvider(acsProvider),
      new AcsHealthInsuranceProvider(),
      new AcsPovertyProvider(),
      new CdcVaccineNationalProvider(acsProvider),
    ];

    this.providersById = this.getProvidersById();
    this.metricsToProviderIds = this.getMetricsToProviderIdsMap();
  }

  private getProvidersById(): Record<ProviderId, VariableProvider> {
    const providersById: Partial<
      Record<ProviderId, VariableProvider>
    > = Object.fromEntries(this.providers.map((p) => [p.providerId, p]));
    return providersById as Record<ProviderId, VariableProvider>;
  }

  private getMetricsToProviderIdsMap(): Record<MetricId, ProviderId> {
    const metricsToProviderIds: Partial<Record<MetricId, ProviderId>> = {};
    this.providers.forEach((provider) => {
      provider.providesMetrics.forEach((varId) => {
        metricsToProviderIds[varId] = provider.providerId;
      });
    });
    return metricsToProviderIds as Record<MetricId, ProviderId>;
  }

  /**
   * Returns a list of all VariableProviders required to get the specified
   * variables.
   */
  getUniqueProviders(metricIds: MetricId[]): VariableProvider[] {
    const providerIds = metricIds.map((id) => {
      const providerId = this.metricsToProviderIds[id];
      if (!providerId) {
        throw new Error("No provider configured for metric id: " + id);
      }
      return providerId;
    });
    const dedupedIds = Array.from(new Set(providerIds));
    return dedupedIds.map((id) => this.providersById[id]);
  }
}
