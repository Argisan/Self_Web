# Testing Documentation for NFToken API

## Setup Instructions
1. **Install Required Tools:** Make sure you have `cURL` installed on your system.
2. **Clone the Repository:** Run the following command to clone the repository:
   
   ```bash
   git clone https://github.com/Argisan/Self_Web.git
   cd Self_Web
   ```

3. **Environment Variables:** Set up the necessary environment variables or configuration files for API access.

## cURL Examples

### Get NFToken Status
```bash
curl -X GET "https://api.example.com/nftoken/status" -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create NFToken
```bash
curl -X POST "https://api.example.com/nftoken/create" -H "Authorization: Bearer YOUR_ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"name": "Token Name", "symbol": "TOKEN"}'
```

## Frontend Testing Guide
1. **Access the Frontend:** Open your browser and navigate to the frontend application.
2. **Test NFToken Creation:** Use the frontend form to create a new NFToken and monitor the API requests in your developer tools.
3. **Check Responses:** Ensure that the tokens created are reflected correctly in your application.

## License Key Workflow
- **Requesting a License Key:** Users can request a license key via email or the web interface.
- **Using the License Key:** Include the license key in the headers when making API requests:
  
  ```bash
  -H "License-Key: YOUR_LICENSE_KEY"
  ```

## Error Codes
| Error Code | Description                        |
|------------|------------------------------------|
| 400        | Bad Request                        |
| 401        | Unauthorized                       |
| 404        | Not Found                          |
| 500        | Internal Server Error              |

## Response Format Examples
### Successful Response
```json
{
  "success": true,
  "data": {
    "id": "1234",
    "name": "Token Name",
    "symbol": "TOKEN"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid input provided"
  }
}
```

---
> **Note:** Make sure to replace placeholder values with actual data when executing API requests.