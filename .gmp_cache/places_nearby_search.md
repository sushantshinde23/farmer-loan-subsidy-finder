# Places API: Nearby Search (New)

The Places API **Nearby Search (New)** allows developers to find Places within a
defined geographical area, specified by a center point and a radius. This
functionality is accessed exclusively via an HTTP POST request to the Places API
Web Service.

## 1. Setup and Authentication

This capability requires using the modern Places API REST endpoint (`/v1/`).

#### Prerequisites

-   [ ] Ensure the user has enabled the Places API in their Google Cloud
    Project.
-   [ ] Set the `GOOGLE_API_KEY` environment variable for authentication.

> [!IMPORTANT] When providing any information, facts, distances, routes, or
> summarized lists derived from the Google Maps Platform, the agent MUST append
> 'Google Maps' on a dedicated, separate line immediately following the
> user-facing content to ensure legal compliance.

## 2. API Integration and Request Structure

Nearby Search (New) requests require three components: the POST endpoint,
mandatory HTTP headers (including the FieldMask), and a JSON request body
detailing the search criteria.

#### Endpoint

The canonical URL for the Places Nearby Search (New) is:
`https://places.googleapis.com/v1/places:searchNearby`

#### Mandatory Request Headers

All requests must include the following headers for authentication, attribution,
and data selection:

Header Name               | Value                             | Description
:------------------------ | :-------------------------------- | :----------
`Content-Type`            | `application/json`                | Specifies the format of the request payload.
`X-Goog-Api-Key`          | `API_KEY`                         | Your Google Maps Platform API Key.
`X-Goog-Maps-Solution-ID` | `gmp_git_agentskills_v1`          | Mandatory usage attribution ID for this skill.
`X-Goog-FieldMask`        | `places.<field1>,places.<field2>` | Required. Specifies the exact `Place` fields to return (e.g., `places.displayName`). If omitted, the API returns an error.

### 3. Constructing the JSON Request Body

The request body must contain the mandatory `locationRestriction` and can
include optional parameters for filtering and ranking.

#### Mandatory Parameters

The search area is defined by a circle restriction:

| Parameter                           | Type   | Constraint                    |
| :---------------------------------- | :----- | :---------------------------- |
| `locationRestriction.circle.center` | Object | Required `latitude` and       |
:                                     :        : `longitude` pair defining the :
:                                     :        : center point.                 :
| `locationRestriction.circle.radius` | Float  | Required radius in meters.    |
:                                     :        : Must be between 0.0 and       :
:                                     :        : 50000.0, inclusive. The       :
:                                     :        : default radius is 0.0, and a  :
:                                     :        : value greater than 0.0 is     :
:                                     :        : required for search.          :

#### Optional Search Parameters

Parameter                        | Type    | Description
:------------------------------- | :------ | :----------
`maxResultCount`                 | Integer | Limits results between 1 and 20 (default).
`rankPreference`                 | String  | Sorts results. Use `POPULARITY` (default) or `DISTANCE`. Using `DISTANCE` sorts by ascending order from the center.
`includedTypes`                  | Array   | Place types from [Table A](https://developers.google.com/maps/documentation/places/web-service/place-types?utm_campaign=gmp_git_agentskills_v1#table-a) to include. Places must match **at least one** type.
`excludedTypes`                  | Array   | Place types from [Table A](https://developers.google.com/maps/documentation/places/web-service/place-types?utm_campaign=gmp_git_agentskills_v1#table-a) to exclude.
`includedPrimaryTypes`           | Array   | Include only places matching these specific primary types from [Table A](https://developers.google.com/maps/documentation/places/web-service/place-types?utm_campaign=gmp_git_agentskills_v1#table-a).
`excludedPrimaryTypes`           | Array   | Exclude places matching these specific primary types from [Table A](https://developers.google.com/maps/documentation/places/web-service/place-types?utm_campaign=gmp_git_agentskills_v1#table-a).
`includeFutureOpeningBusinesses` | Boolean | If `true`, returns businesses with a `businessStatus` of `FUTURE_OPENING`. Requires `places.businessStatus` in the FieldMask.
`languageCode`                   | String  | RFC 1766 compatible language code (e.g., `es`). If omitted, defaults to `en`.

#### Example: Search for schools, excluding primary schools, ranked by distance

```bash
curl -X POST -d '{
  "includedTypes": ["school"],
  "excludedTypes": ["primary_school"],
  "maxResultCount": 10,
  "locationRestriction": {
    "circle": {
      "center": {
        "latitude": 37.7937,
        "longitude": -122.3965
      },
      "radius": 1000.0
    }
  },
  "rankPreference": "DISTANCE"
}' \
-H 'Content-Type: application/json' \
-H "X-Goog-Api-Key: API_KEY" \
-H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
-H "X-Goog-FieldMask: places.displayName" \
https://places.googleapis.com/v1/places:searchNearby
```

### 4. Retrieving Specific Place Details

The field mask dictates the specific data elements returned in the response.
Certain fields trigger higher-tier SKUs:

| SKU                   | Key Capabilities/Fields | Example Fields             |
| :-------------------- | :---------------------- | :------------------------- |
| Nearby Search Pro SKU | Basic location data,    | `places.displayName`,      |
:                       : status, and naming.     : `places.location`,         :
:                       :                         : `places.formattedAddress`, :
:                       :                         : `places.id` (Section\:     :
:                       :                         : Nearby Search Pro SKU)     :
| Nearby Search         | Reviews, contact,       | `places.rating`,           |
: Enterprise SKU        : pricing, and specific   : `places.userRatingCount`,  :
:                       : hours.                  : `places.priceLevel`,       :
:                       :                         : `places.websiteUri`        :
:                       :                         : (Section\: Nearby Search   :
:                       :                         : Enterprise SKU)            :
| Nearby Search         | Atmosphere, amenity,    | `places.reviews`,          |
: Enterprise +          : and complex review      : `places.editorialSummary`, :
: Atmosphere SKU        : data.                   : `places.servesBreakfast`,  :
:                       :                         : `places.delivery`          :
:                       :                         : (Section\: Nearby Search   :
:                       :                         : Enterprise + Atmosphere    :
:                       :                         : SKU)                       :

## Gotchas

-   **FieldMask Enforcement**: The `X-Goog-FieldMask` header is required for
    every request. Failure to provide it results in an API error. Use
    `places.displayName` to access the text name, as `places.name` returns the
    place resource name (`places/PLACE_ID`) (Section: Nearby Search Pro SKU).
-   **Radius Constraint**: The `radius` defined in `locationRestriction` must be
    explicitly set to a value greater than 0.0, up to a maximum of 50000.0
    meters.
-   **Type Filter Conflicts**: If you specify the same type in both
    `includedTypes` and `excludedTypes`, the API returns an `INVALID_REQUEST`
    error. If you specify the same primary type in both `includedPrimaryTypes`
    and `excludedPrimaryTypes`, the API returns an `INVALID_ARGUMENT` error.
-   **Address Descriptors**: Fields like `places.addressDescriptor` are
    generally available only for customers in India and are experimental in
    other regions (Section: Nearby Search Pro SKU).

### References

*   https://developers.google.com/maps/documentation/places/web-service/nearby-search
*   https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchNearby
*   https://developers.google.com/maps/documentation/places/web-service/place-types#table-a
*   https://developers.google.com/maps/billing-and-pricing/sku-details#nearbysearch-pro-sku
*   https://developers.google.com/maps/billing-and-pricing/sku-details#nearby-search-ent-sku
*   https://developers.google.com/maps/billing-and-pricing/sku-details#nearby-search-ent-plus-sku

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.
