from rest_framework.test import APITestCase
from rest_framework import status
from .models import InfoPage

class InfoPageTests(APITestCase):
    def setUp(self):
        # ვქმნით სატესტო მონაცემს ბაზისთვის
        self.page = InfoPage.objects.create(
            title="ტესტური გვერდი",
            content_blocks=[{"type": "text", "value": "გამარჯობა მსოფლიო"}]
        )

    def test_get_info_pages_list(self):
        """ვამოწმებთ გვერდების სიის წამოღებას"""
        response = self.client.get('/api/info-pages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "ტესტური გვერდი")
        self.assertEqual(response.data[0]['content_blocks'][0]['value'], "გამარჯობა მსოფლიო")

    def test_get_single_info_page(self):
        """ვამოწმებთ ერთი კონკრეტული გვერდის დეტალების წამოღებას ID-ით"""
        response = self.client.get(f'/api/info-pages/{self.page.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "ტესტური გვერდი")
        self.assertIn('content_blocks', response.data)

    def test_get_nonexistent_info_page(self):
        """ვამოწმებთ არარსებული გვერდის მოთხოვნას (უნდა დააბრუნოს 404)"""
        response = self.client.get('/api/info-pages/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_empty_info_pages_list(self):
        """ვამოწმებთ სიას, როდესაც ბაზა ცარიელია"""
        InfoPage.objects.all().delete()
        response = self.client.get('/api/info-pages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])