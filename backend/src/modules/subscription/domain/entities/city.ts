export interface CityData {
  id?: number;
  externalId: number | null | undefined;
  name: string;
  region: string;
  country: string;
  fullName?: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

export class City {
  public readonly id: number | null;
  public readonly externalId: number | null;
  public readonly name: string;
  public readonly region: string;
  public readonly country: string;
  public readonly fullName: string;
  public readonly latitude: number | null;
  public readonly longitude: number | null;

  constructor(data: CityData) {
    this.id = data.id ?? null;
    this.externalId = data.externalId ?? null;
    this.name = data.name;
    this.region = data.region;
    this.country = data.country;
    this.fullName = data.fullName ?? this.generateFullName(data.name, data.region, data.country);
    this.latitude = data.latitude ?? null;
    this.longitude = data.longitude ?? null;
  }

  private generateFullName(name: string, region: string, country: string): string {
    return [name, region, country].filter(Boolean).join(', ');
  }
}
