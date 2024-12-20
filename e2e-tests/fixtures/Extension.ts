import { APIRequestContext, Page } from '@playwright/test';
import { getUserCookieValue } from '../utilities/helpers';

export class Extension {
  async createExtension(page: Page, request: APIRequestContext, extensionName: string): Promise<number | undefined> {
    const cookie = getUserCookieValue(await page.context().cookies());

    if (cookie !== undefined) {
      const response = await request.post('http://localhost:8080/v1/graphql/', {
        data: JSON.stringify({
          query: `
            mutation InsertExtension {
              insert_extensions(objects: {
                label: "${extensionName}",
                description: "Description for ${extensionName}",
                url: "http://localhost:8080",
                extension_roles: {
                  data: {
                    role: aerie_admin
                  }
                }
              }) {
                returning {
                  id
                }  
              }
            }`,
        }),
        headers: {
          Authorization: `Bearer ${cookie}`,
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()).data.insert_extensions.returning;

      return data[0].id as number;
    }
  }

  async deleteExtension(page: Page, request: APIRequestContext, id: number): Promise<void> {
    const cookie = getUserCookieValue(await page.context().cookies());

    if (cookie !== undefined) {
      await request.post('http://localhost:8080/v1/graphql/', {
        data: JSON.stringify({
          query: `
            mutation DeleteExtension {
              delete_extensions(where: {
                id: {
                  _eq: ${id}
                }
              }) {
                returning {
                  id
                }  
              }
            }`,
        }),
        headers: {
          Authorization: `Bearer ${cookie}`,
          'Content-Type': 'application/json',
        },
      });
    }
  }
}
