from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from .settings import env_bool, env_list


class EnvironmentConfigurationTests(SimpleTestCase):
    def test_boolean_values_and_default(self):
        with patch.dict('os.environ', {}, clear=True):
            self.assertTrue(env_bool('SETUP_TEST_FLAG', True))
            self.assertFalse(env_bool('SETUP_TEST_FLAG'))
        for value, expected in [('true', True), (' YES ', True), ('1', True),
                                ('false', False), ('no', False), ('0', False)]:
            with self.subTest(value=value), patch.dict('os.environ', {'SETUP_TEST_FLAG': value}):
                self.assertEqual(env_bool('SETUP_TEST_FLAG'), expected)

    def test_invalid_boolean_is_rejected(self):
        with patch.dict('os.environ', {'SETUP_TEST_FLAG': 'tru'}):
            with self.assertRaises(ImproperlyConfigured):
                env_bool('SETUP_TEST_FLAG')

    def test_host_list_strips_whitespace_and_empty_entries(self):
        with patch.dict('os.environ', {'SETUP_TEST_HOSTS': ' localhost, ,127.0.0.1, '}):
            self.assertEqual(env_list('SETUP_TEST_HOSTS'), ['localhost', '127.0.0.1'])
