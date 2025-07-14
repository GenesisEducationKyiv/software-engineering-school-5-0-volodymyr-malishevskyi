export interface CityData {
  id?: number;
  externalId?: number;
  name: string;
  region: string;
  country: string;
  fullName?: string;
  latitude?: number;
  longitude?: number;
}

export class City {
  public readonly id?: number;
  public readonly externalId?: number;
  public readonly name: string;
  public readonly region: string;
  public readonly country: string;
  public readonly fullName: string;
  public readonly latitude?: number;
  public readonly longitude?: number;

  constructor(data: CityData) {
    this.id = data.id;
    this.externalId = data.externalId;
    this.name = data.name;
    this.region = data.region;
    this.country = data.country;
    this.fullName = data.fullName || this.generateFullName(data.name, data.region, data.country);
    this.latitude = data.latitude;
    this.longitude = data.longitude;
  }

  private generateFullName(name: string, region: string, country: string): string {
    return [name, region, country].filter(Boolean).join(', ');
  }
}
